import { getUser } from '../auth-helper.js';
import { resolveTenant } from '../tenant-helper.js';
import { encrypt } from '../crypto-helper.js';
import { checkPermission } from '../rbac-helper.js';

// Los 14 tipos de documento del ciclo PIE (debe coincidir con docs-registry.js).
// 'paci' y 'pai' son los originales con editores propios; el resto usa /docs.html.
const VALID_PLAN_TYPES = [
  'paci', 'pai',
  // Fase ingreso
  'anamnesis', 'informe_psicopedagogico', 'fudei',
  'informe_especialista', 'autorizacion_familia', 'valoracion_salud',
  // Fase planificacion (extras a paci/pai)
  'registro_colaborativo', 'registro_atencion', 'intervencion_neep',
  // Fase seguimiento
  'informe_familia', 'fur', 'informe_avance'
];

// Tipos "stub": guardamos student + fecha + notas, sin requerir modulos/apoyos/etc.
const STUB_PLAN_TYPES = new Set([
  'anamnesis', 'informe_psicopedagogico', 'fudei',
  'informe_especialista', 'autorizacion_familia', 'valoracion_salud',
  'registro_colaborativo', 'registro_atencion', 'intervencion_neep',
  'informe_familia', 'fur', 'informe_avance'
]);

// Inserta UN documento (anual, trimestral o suelto) junto con sus OAs.
// Centraliza la logica para reutilizarla tanto en el caso de un solo documento
// como en el de un plan anual con sus 3 trimestres hijos.
// Devuelve { docId, numModules, numOas }.
async function insertDocument(db, userEmail, studentId, opts) {
  const {
    student, team, trimester,
    planType, planScope, parentId, trimesterIndex, tenantId
  } = opts;
  const modules = opts.modules || [];
  const apoyos = opts.apoyos || [];
  const isPai = planType === 'pai';
  // skipOas: el plan anual PADRE de una familia NO materializa sus OAs en
  // document_oas (sus OAs viven en los trimestres hijos). Evita el doble conteo
  // en reportes y estados de progreso contradictorios. El padre conserva todo
  // en document_json para impresion.
  const skipOas = opts.skipOas === true;

  // Calcular resumen para la vista de lista (dashboard).
  // PACI resume por asignaturas y clases; PAI resume por tipos de apoyo.
  const subjects = isPai
    ? [...new Set(apoyos.map(a => a.tipoApoyo).filter(Boolean))].join(', ')
    : [...new Set(modules.map(m => m.asig).filter(Boolean))].join(', ');
  const subjectKeys = isPai
    ? ''
    : [...new Set(modules.map(m => m.asigKey).filter(Boolean))].join(',');
  const allClases = modules.flatMap(m => m.clases || []);
  const dateStart = allClases.length ? allClases[0].date || '' : '';
  const dateEnd = allClases.length ? allClases[allClases.length - 1].date || '' : '';
  const numClasses = isPai ? apoyos.length : allClases.length;

  // El PAI guarda sus apoyos en document_json; el PACI guarda sus modulos.
  // Extras MINEDUC: PAI (evaluacion, metas, estrategias DUA, seguimiento, firmas, antecedentes salud)
  // y PACI (necesidades contextuales, adecuaciones tipificadas, criterios evaluacion, firmas, link PAI padre).
  // Si no vienen en opts, intentamos heredarlos del docJson previo (en update) o quedan undefined.
  const extras = {
    antecedentesSalud: opts.antecedentesSalud,
    evaluacion: opts.evaluacion,
    metas: opts.metas,
    estrategiasDua: opts.estrategiasDua,
    seguimiento: opts.seguimiento,
    firmas: opts.firmas,
    contextual: opts.contextual,
    criteriosEvaluacion: opts.criteriosEvaluacion,
    adecuaciones: opts.adecuaciones,
    parentPaiId: opts.parentPaiId,
    fecha: opts.fecha,
    notas: opts.notas
  };
  const docJson = JSON.stringify({ student, team, modules, apoyos, ...extras });

  const docRes = await db.prepare(
    `INSERT INTO documents
       (user_email, student_id, trimester, subject, subject_key, work_level,
        date_start, date_end, num_classes, document_json,
        plan_type, plan_scope, parent_id, trimester_index, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userEmail, studentId, trimester || '', subjects, subjectKeys,
    student.workLevel || '', dateStart, dateEnd, numClasses, docJson,
    planType, planScope, parentId, trimesterIndex, tenantId
  ).run();

  const docId = docRes.meta.last_row_id;

  // Guardar OAs de todos los modulos.
  // Compatibilidad: acepta el formato nuevo (textoOriginal/textoAdecuado) y el legacy (text).
  // oa_text se mantiene espejando textoAdecuado para no romper lecturas existentes.
  const oaStmts = [];
  if (!skipOas) {
    for (const mod of modules) {
      if (mod.oas && mod.oas.length) {
        for (const oa of mod.oas) {
          const original = oa.textoOriginal || oa.text || '';
          const adapted = oa.textoAdecuado || oa.text || original;
          oaStmts.push(
            db.prepare(
              `INSERT INTO document_oas (document_id, student_id, subject, subject_key, level, unit_name, oa_code, oa_text, oa_text_original, oa_text_adapted, trimester)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              docId, studentId, mod.asig || '', mod.asigKey || '',
              mod.nivelTrabajo || '', oa.unit || '', oa.code || '',
              adapted, original, adapted,
              trimester || ''
            )
          );
        }
      }
    }
  }

  if (oaStmts.length > 0) {
    await db.batch(oaStmts);
  }

  return { docId, numModules: modules.length, numOas: oaStmts.length };
}

// Actualiza un documento existente (editar y re-guardar) en lugar de crear uno
// nuevo. Preserva el tipo, alcance y vinculo (plan_type, plan_scope, parent_id,
// trimester_index) del documento salvo que vengan valores explicitos en opts,
// de modo que editar un trimestre hijo NO lo desvincula de su plan anual.
// Devuelve { docId, numModules, numOas } o null si el documento no existe / no
// pertenece al usuario (el caller cae entonces a INSERT).
async function updateDocument(db, userEmail, documentId, opts) {
  const tenantId = opts.tenantId;
  // Aislamiento por establecimiento: cualquier miembro del colegio puede editar el documento.
  const existing = await db.prepare(
    'SELECT id, student_id, plan_type, plan_scope, parent_id, trimester_index FROM documents WHERE id = ? AND tenant_id = ?'
  ).bind(documentId, tenantId).first();
  if (!existing) return null;

  const { student, team, trimester } = opts;
  const modules = opts.modules || [];
  const apoyos = opts.apoyos || [];
  const studentId = existing.student_id;

  // Si este documento es un plan anual PADRE (tiene trimestres hijos), no
  // materializa OAs en document_oas: sus OAs viven en los hijos (evita doble conteo).
  const kids = await db.prepare('SELECT COUNT(*) AS n FROM documents WHERE parent_id = ?').bind(documentId).first();
  const isFamilyParent = !!(kids && kids.n > 0);

  const planType = opts.planType || existing.plan_type || 'paci';
  const isPai = planType === 'pai';
  const planScope = opts.planScope || existing.plan_scope || 'trimestral';
  const parentId = (opts.parentId != null) ? opts.parentId : (existing.parent_id != null ? existing.parent_id : null);
  const trimesterIndex = (opts.trimesterIndex != null) ? opts.trimesterIndex : (existing.trimester_index != null ? existing.trimester_index : null);

  const subjects = isPai
    ? [...new Set(apoyos.map(a => a.tipoApoyo).filter(Boolean))].join(', ')
    : [...new Set(modules.map(m => m.asig).filter(Boolean))].join(', ');
  const subjectKeys = isPai
    ? ''
    : [...new Set(modules.map(m => m.asigKey).filter(Boolean))].join(',');
  const allClases = modules.flatMap(m => m.clases || []);
  const dateStart = allClases.length ? allClases[0].date || '' : '';
  const dateEnd = allClases.length ? allClases[allClases.length - 1].date || '' : '';
  const numClasses = isPai ? apoyos.length : allClases.length;
  // Extras MINEDUC: PAI (evaluacion, metas, estrategias DUA, seguimiento, firmas, antecedentes salud)
  // y PACI (necesidades contextuales, adecuaciones tipificadas, criterios evaluacion, firmas, link PAI padre).
  // Si no vienen en opts, intentamos heredarlos del docJson previo (en update) o quedan undefined.
  const extras = {
    antecedentesSalud: opts.antecedentesSalud,
    evaluacion: opts.evaluacion,
    metas: opts.metas,
    estrategiasDua: opts.estrategiasDua,
    seguimiento: opts.seguimiento,
    firmas: opts.firmas,
    contextual: opts.contextual,
    criteriosEvaluacion: opts.criteriosEvaluacion,
    adecuaciones: opts.adecuaciones,
    parentPaiId: opts.parentPaiId,
    fecha: opts.fecha,
    notas: opts.notas
  };
  const docJson = JSON.stringify({ student, team, modules, apoyos, ...extras });

  await db.prepare(
    `UPDATE documents SET trimester = ?, subject = ?, subject_key = ?, work_level = ?,
       date_start = ?, date_end = ?, num_classes = ?, document_json = ?,
       plan_type = ?, plan_scope = ?, parent_id = ?, trimester_index = ?, updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    trimester || '', subjects, subjectKeys, student.workLevel || '',
    dateStart, dateEnd, numClasses, docJson,
    planType, planScope, parentId, trimesterIndex,
    documentId, tenantId
  ).run();

  // Reemplazar los OAs: borrar los viejos e insertar los actuales.
  // Si es un plan anual padre, solo se borran (no se re-insertan): no debe tener OAs propios.
  const stmts = [db.prepare('DELETE FROM document_oas WHERE document_id = ?').bind(documentId)];
  if (!isFamilyParent) {
    for (const mod of modules) {
      if (mod.oas && mod.oas.length) {
        for (const oa of mod.oas) {
          const original = oa.textoOriginal || oa.text || '';
          const adapted = oa.textoAdecuado || oa.text || original;
          stmts.push(
            db.prepare(
              `INSERT INTO document_oas (document_id, student_id, subject, subject_key, level, unit_name, oa_code, oa_text, oa_text_original, oa_text_adapted, trimester)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              documentId, studentId, mod.asig || '', mod.asigKey || '',
              mod.nivelTrabajo || '', oa.unit || '', oa.code || '',
              adapted, original, adapted,
              trimester || ''
            )
          );
        }
      }
    }
  }
  await db.batch(stmts);

  return { docId: documentId, numModules: modules.length, numOas: stmts.length - 1 };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Solo educador_diferencial, teacher y admin pueden crear/editar PACI/PAI
    const denied = checkPermission(user.role, 'paci:create');
    if (denied) return denied;

    // Establecimiento del usuario: todo lo que cree/edite queda bajo este tenant.
    const tenant = await resolveTenant(request, env, user);
    if (!tenant) return new Response(JSON.stringify({ ok: false, error: 'No tienes un establecimiento asignado.' }), { status: 400, headers });
    const tenantId = tenant.id;

    const body = await request.json();
    const {
      student, modules, trimester, team, trimesters, apoyos,
      // Extras MINEDUC: PAI
      antecedentesSalud, evaluacion, metas, estrategiasDua, seguimiento, firmas,
      // Extras MINEDUC: PACI
      contextual, criteriosEvaluacion, adecuaciones, parentPaiId,
      // Extras para tipos stub (anamnesis, fudei, registro colaborativo, etc.)
      fecha, notas
    } = body;

    // planType: 'paci' (adapta curriculum) o 'pai' (organiza apoyos). Default 'paci'.
    const planType = VALID_PLAN_TYPES.includes(body.planType) ? body.planType : 'paci';
    const isPai = planType === 'pai';

    // Empaqueta los extras MINEDUC + extras de docs stub para pasarlos a insertDocument/updateDocument.
    const minEducExtras = {
      antecedentesSalud, evaluacion, metas, estrategiasDua, seguimiento, firmas,
      contextual, criteriosEvaluacion, adecuaciones, parentPaiId,
      fecha, notas,
      // tenantId fluye a insertDocument/updateDocument (que hacen ...minEducExtras).
      tenantId
    };

    // Caso "familia": solo aplica a PACI. Llega un arreglo de trimestres -> 1 anual padre + N hijos.
    const hasFamily = !isPai && Array.isArray(trimesters) && trimesters.length > 0;

    // Validacion segun tipo de plan:
    // - PAI requiere al menos un apoyo.
    // - PACI requiere modulos (o un arreglo de trimestres en el caso familia).
    // - Stub (anamnesis, fudei, etc.): solo requiere nombre del estudiante.
    const isStub = STUB_PLAN_TYPES.has(planType);
    const missingPai = isPai && !isStub && (!Array.isArray(apoyos) || !apoyos.length);
    const missingPaci = !isPai && !isStub && !hasFamily && (!modules || !modules.length);
    if (!student || !student.name || missingPai || missingPaci) {
      return new Response(JSON.stringify({ ok: false, error: 'Datos incompletos.' }), { status: 400, headers });
    }

    const db = env.DB;

    // Buscar o crear estudiante (compartido por establecimiento)
    let studentRow = await db.prepare(
      'SELECT id FROM students WHERE tenant_id = ? AND name = ?'
    ).bind(tenantId, student.name).first();

    // Cifrar campo sensible (diagnostico) antes de guardar
    const encDiag = env.ENCRYPTION_KEY
      ? await encrypt(student.diagnosis || '', env.ENCRYPTION_KEY)
      : (student.diagnosis || '');

    if (!studentRow) {
      const res = await db.prepare(
        `INSERT INTO students (user_email, name, diagnosis, diagnosis_id, real_level, work_level, school, birth_date, age, real_skills, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        user.email, student.name, encDiag, student.diagnosisId || '',
        student.realLevel || '', student.workLevel || '', student.school || '',
        student.birthDate || '', student.age || 0, student.realSkills || '', tenantId
      ).run();
      studentRow = { id: res.meta.last_row_id };
    } else {
      await db.prepare(
        `UPDATE students SET diagnosis = ?, diagnosis_id = ?, real_level = ?, work_level = ?,
         school = ?, birth_date = ?, age = ?, real_skills = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(
        encDiag, student.diagnosisId || '', student.realLevel || '',
        student.workLevel || '', student.school || '', student.birthDate || '',
        student.age || 0, student.realSkills || '', studentRow.id
      ).run();
    }

    const studentId = studentRow.id;

    // --- Caso plan anual + trimestres vinculados ---
    if (hasFamily) {
      // 1) Crear el plan anual (padre). Sus modulos pueden venir en body.annual.modules
      //    o, por compatibilidad, en el campo modules de nivel superior.
      const annualModules = (body.annual && body.annual.modules) || modules || [];
      const parent = await insertDocument(db, user.email, studentId, {
        student, team, modules: annualModules,
        trimester: (body.annual && body.annual.trimester) || 'Anual',
        planType, planScope: 'anual', parentId: null, trimesterIndex: null,
        // El padre no materializa OAs: viven en los trimestres hijos (evita doble conteo).
        skipOas: true,
        ...minEducExtras
      });

      // 2) Crear los trimestrales (hijos), cada uno vinculado al padre por parent_id.
      const childIds = [];
      let idx = 0;
      for (const t of trimesters) {
        idx += 1;
        const child = await insertDocument(db, user.email, studentId, {
          student, team, modules: (t && t.modules) || [],
          trimester: (t && t.trimester) || `${idx}º Trimestre`,
          planType, planScope: 'trimestral',
          parentId: parent.docId,
          trimesterIndex: (t && t.trimesterIndex) || idx,
          ...minEducExtras
        });
        childIds.push(child.docId);
      }

      return new Response(JSON.stringify({
        ok: true,
        studentId,
        documentId: parent.docId,
        parentId: parent.docId,
        childIds,
        message: `Plan anual guardado con ${childIds.length} trimestre(s) vinculado(s).`
      }), { status: 201, headers });
    }

    // --- Caso editar: si llega documentId y el documento existe, ACTUALIZA ---
    // Evita crear duplicados al re-guardar y preserva el vinculo (parent_id).
    if (body.documentId) {
      const updated = await updateDocument(db, user.email, body.documentId, {
        student, team, modules, apoyos, trimester, planType,
        planScope: body.planScope,
        parentId: body.parentId,
        trimesterIndex: body.trimesterIndex,
        ...minEducExtras
      });
      if (updated) {
        const detalleUpd = isPai
          ? `${(apoyos || []).length} apoyo(s)`
          : `${updated.numModules} modulo(s) y ${updated.numOas} OA(s)`;
        return new Response(JSON.stringify({
          ok: true,
          studentId,
          documentId: updated.docId,
          updated: true,
          message: `${planType.toUpperCase()} actualizado con ${detalleUpd}.`
        }), { status: 200, headers });
      }
      // Si el documento no existe o no es del usuario, cae a INSERT abajo.
    }

    // --- Caso un solo documento (compatibilidad con el flujo actual) ---
    // Si no llega plan_scope explicito, se infiere del trimestre.
    const inferredScope = (trimester === 'Anual') ? 'anual' : 'trimestral';
    const result = await insertDocument(db, user.email, studentId, {
      student, team, modules, apoyos, trimester,
      planType,
      planScope: body.planScope || inferredScope,
      parentId: body.parentId || null,
      trimesterIndex: body.trimesterIndex || null,
      ...minEducExtras
    });

    const detalle = isPai
      ? `${(apoyos || []).length} apoyo(s)`
      : `${result.numModules} modulo(s) y ${result.numOas} OA(s)`;

    return new Response(JSON.stringify({
      ok: true,
      studentId,
      documentId: result.docId,
      message: `${planType.toUpperCase()} guardado con ${detalle}.`
    }), { status: 201, headers });

  } catch (e) {
    console.error('Error al guardar documento:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error al guardar el documento.' }), { status: 500, headers });
  }
}
