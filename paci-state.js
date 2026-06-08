/**
 * PIE MASTER - Estado Global y Configuración de Equipo
 */

window.state = {
    equipo: [
        {id: 1, rol: 'Profesor/a de Educación Diferencial', nom: 'Carlos Molina Salgado'},
        {id: 2, rol: 'Psicólogo', nom: 'Marcos Paine Paillao'},
        {id: 3, rol: 'Fonoaudiólogo/a', nom: 'Fernanda Duhart Fernandez'},
        {id: 4, rol: 'Profesor/a Jefe', nom: ''},
        {id: 5, rol: 'Coordinador/a PIE', nom: 'Gladys Matamala Salas'},
        {id: 6, rol: 'Profesor/a de Lenguaje y Comunicación', nom: ''},
        {id: 7, rol: 'Profesor/a de Matemáticas', nom: ''},
        {id: 8, rol: 'Apoderado/a o Familia', nom: ''},
        {id: 9, rol: 'Jefe/a UTP / Coordinador/a PIE', nom: ''}
    ],
    modulos: [],
    bufferOAs: []
};

// Flags de permisos (se actualizan al verificar sesión)
window.PACI_ROLE = 'guest';
window.PACI_CAN_EDIT = false;
window.PACI_USER_EMAIL = '';
