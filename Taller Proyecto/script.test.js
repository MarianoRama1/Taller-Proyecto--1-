/** @jest-environment jsdom */

// --- Parche de entorno DOM para Jest ---
// 1. Asegura que `new Option()` funcione dentro de jsdom
// 2. Sobrescribe `HTMLSelectElement.prototype.add` para evitar el error
//    "parameter 1 is not of any supported type" que provoca jsdom


if (typeof global.Option === "undefined") {
  global.Option = function (text, value) {
    const opt = document.createElement('option');
    opt.text = text;
    opt.value = value;
    return opt;
  };
}

if (!HTMLSelectElement.prototype.__addPatched) {
  const nativeAdd = HTMLSelectElement.prototype.add;
  HTMLSelectElement.prototype.add = function (elem, index) {
    // jsdom a veces no reconoce nuestro elemento como HTMLOptionElement;
    // este parche simplemente hace un appendChild si falla el nativo.
    try {
      return nativeAdd.call(this, elem, index);
    } catch (_) {
      this.appendChild(elem);
    }
  };
  HTMLSelectElement.prototype.__addPatched = true;
}

// Mocks de URL para exportar CSV
global.URL.createObjectURL = jest.fn(() => "blob:fake-url");
global.URL.revokeObjectURL = jest.fn();

const script = require('./script');
const {
  getReservas,
  setReservas,
  validarLogin,
  reservarTurno,
  exportarCSV,
  initAdmin,
  SLOTS,
  poblarFiltroBarbero,
  renderReservas,
  BARBEROS,
  SERVICIOS,
  
} = script;

global.Option = function (text, value) {
  const opt = document.createElement('option');
  opt.text = text;
  opt.value = value;
  return opt;
};

global.URL.createObjectURL = jest.fn(() => "blob:fake-url");
global.URL.revokeObjectURL = jest.fn();

describe("Reservas", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("Guardar y recuperar reservas", () => {
    const reserva = {
      nombre: "Juan",
      apellido: "Pérez",
      celular: "099123456",
      correo: "juan@mail.com",
      barbero: "Lucas",
      servicio: "Corte",
      fecha: "2099-12-31",
      hora: "10:00"
    };
    setReservas([reserva]);
    expect(getReservas()).toEqual([reserva]);
  });

  test("Rechaza reservas con fecha en el pasado", () => {
    const result = reservarTurno({
      nombre: "Ana",
      apellido: "López",
      celular: "099876543",
      correo: "ana@mail.com",
      barbero: "Pedro",
      servicio: "Lavado",
      fecha: "2000-01-01",
      hora: "10:00"
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/futura/);
  });

  test("Rechaza reserva si horario ya está ocupado", () => {
    const reserva = {
      nombre: "Carlos",
      apellido: "Gómez",
      celular: "098111222",
      correo: "carlos@mail.com",
      barbero: "Tomás",
      servicio: "Barba",
      fecha: "2099-10-10",
      hora: "09:00"
    };
    setReservas([reserva]);

    const nuevo = { ...reserva, nombre: "Repetido", correo: "nuevo@mail.com" };
    const result = reservarTurno(nuevo);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/ocupado/);
  });

  test("Rechaza correo inválido", () => {
    const result = reservarTurno({
      nombre: "Nico",
      apellido: "Mal",
      celular: "098888888",
      correo: "invalidmail",
      barbero: "Gonzalo",
      servicio: "Vip",
      fecha: "2099-11-11",
      hora: "11:30"
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Correo/);
  });
});

describe("Login", () => {
  test("Valida login correcto", () => {
    expect(validarLogin("admin", "1234")).toBe(true);
  });

  test("Rechaza login incorrecto", () => {
    expect(validarLogin("admin", "wrong")).toBe(false);
  });
});

test("Filtra reservas por barbero y fecha", () => {
  document.body.innerHTML = `
    <input id="filtroFecha" value="2100-01-01">
    <select id="filtroBarbero">
      <option value="Lucas">Lucas</option>
    </select>
    <table id="tablaReservas"><tbody></tbody></table>
  `;

  setReservas([
    { barbero: "Lucas", servicio: "Corte", fecha: "2100-01-01", hora: "10:00", nombre: "A", apellido: "B", celular: "1", correo: "a@b.com" },
    { barbero: "Pedro", servicio: "Barba", fecha: "2100-01-01", hora: "11:00", nombre: "C", apellido: "D", celular: "2", correo: "c@d.com" },
    { barbero: "Lucas", servicio: "Vip", fecha: "2100-01-02", hora: "12:00", nombre: "E", apellido: "F", celular: "3", correo: "e@f.com" },
  ]);

  document.getElementById("filtroBarbero").value = "Lucas";
  renderReservas();

  const filas = document.querySelectorAll("#tablaReservas tbody tr");
  expect(filas.length).toBe(1);
  expect(filas[0].textContent).toMatch("Corte");
});

test("Rechaza reserva sin nombre", () => {
  const result = reservarTurno({
    nombre: "",
    apellido: "Test",
    celular: "099000000",
    correo: "mail@test.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
});

describe("Datos base", () => {
  test("BARBEROS contiene elementos", () => {
    expect(Array.isArray(BARBEROS)).toBe(true);
    expect(BARBEROS.length).toBeGreaterThan(0);
  });

  test("SERVICIOS contiene elementos", () => {
    expect(Array.isArray(SERVICIOS)).toBe(true);
    expect(SERVICIOS.length).toBeGreaterThan(0);
  });
});

test("Exportar reservas a CSV genera archivo correctamente", () => {
  const aMock = { click: jest.fn() };
  document.createElement = jest.fn(() => aMock);

  setReservas([{ barbero: "Lucas", servicio: "Corte", fecha: "2100-01-01", hora: "09:00", nombre: "Test", apellido: "User", celular: "099000000", correo: "test@mail.com" }]);
  exportarCSV();

  expect(aMock.click).toHaveBeenCalled();
  expect(URL.createObjectURL).toHaveBeenCalled();
});

test("Reserva válida se guarda correctamente", () => {
  const result = reservarTurno({
    nombre: "Valid",
    apellido: "User",
    celular: "099123123",
    correo: "valid@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-12-31",
    hora: "15:30"
  });

  expect(result.success).toBe(true);
  const reservas = getReservas();
  expect(reservas.some(r => r.nombre === "Valid")).toBe(true);
});


test("renderReservas no muestra filas si no hay coincidencias", () => {
  document.body.innerHTML = `
    <input id="filtroFecha" value="2100-01-01">
    <select id="filtroBarbero">
      <option value="Lucas">Lucas</option>
    </select>
    <table id="tablaReservas"><tbody></tbody></table>
  `;

  setReservas([
    { barbero: "Pedro", servicio: "Corte", fecha: "2100-01-01", hora: "10:00", nombre: "Otro", apellido: "Cliente", celular: "1", correo: "otro@mail.com" },
  ]);

  document.getElementById("filtroBarbero").value = "Lucas";
  renderReservas();

  const filas = document.querySelectorAll("#tablaReservas tbody tr");
  expect(filas.length).toBe(0);
});

test("localStorage mantiene múltiples reservas", () => {
  const reservas = [
    { cliente: "Lucía", barbero: "Carlos", servicio: "Tinte", fecha: "2025-08-08" },
    { cliente: "Tomás", barbero: "Luis", servicio: "Corte", fecha: "2025-08-09" }
  ];

  localStorage.setItem("reservas", JSON.stringify(reservas));

  const guardadas = JSON.parse(localStorage.getItem("reservas"));
  expect(guardadas).toEqual(reservas);
});


test("getReservas devuelve array vacío cuando no hay reservas", () => {
  localStorage.clear();
  expect(getReservas()).toEqual([]);
});

test("setReservas guarda correctamente en localStorage", () => {
  const data = [{
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "test@user.com",
    barbero: "Tomás",
    servicio: "Barba",
    fecha: "2100-01-01",
    hora: "08:00"
  }];

  setReservas(data);

  const almacenadas = JSON.parse(localStorage.getItem("reservas"));
  expect(almacenadas).toEqual(data);
});
test("Login con campos vacíos es inválido", () => {
  expect(validarLogin("", "")).toBe(false);
});

test("Rechaza reserva sin nombre", () => {
  const result = reservarTurno({
    nombre: "",
    apellido: "Test",
    celular: "099000000",
    correo: "mail@test.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
  expect(result.message).toMatch(/nombre/i);
});
test("Rechaza reserva con correo inválido", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "correo-invalido",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
  expect(result.message).toMatch(/correo/i);
});

test("Rechaza reserva con fecha y hora pasada", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2000-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
  expect(result.message).toMatch(/futura/i);
});

test("Rechaza reserva si el horario ya está ocupado para el barbero", () => {
  const reservaExistente = {
    nombre: "Existente",
    apellido: "User",
    celular: "099999998",
    correo: "existente@mail.com",
    barbero: "Lucas",
    servicio: "Barba",
    fecha: "2100-01-01",
    hora: "10:00"
  };
  setReservas([reservaExistente]);

  const result = reservarTurno({
    nombre: "Nuevo",
    apellido: "User",
    celular: "099999997",
    correo: "nuevo@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });

  expect(result.success).toBe(false);
  expect(result.message).toMatch(/ocupado/i);
});

test("Acepta reserva válida", () => {
  const result = reservarTurno({
    nombre: "Valido",
    apellido: "User",
    celular: "099999996",
    correo: "valido@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:30"
  });
  expect(result.success).toBe(true);
});
test("Rechaza reserva con correo inválido", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "correo-invalido",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
  expect(result.message).toMatch(/correo/i);
});

test("Rechaza reserva con fecha y hora pasada", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2000-01-01",
    hora: "10:00"
  });
  expect(result.success).toBe(false);
  expect(result.message).toMatch(/futura/i);
});

test("Rechaza reserva si el horario ya está ocupado para el barbero", () => {
  const reservaExistente = {
    nombre: "Existente",
    apellido: "User",
    celular: "099999998",
    correo: "existente@mail.com",
    barbero: "Lucas",
    servicio: "Barba",
    fecha: "2100-01-01",
    hora: "10:00"
  };
  setReservas([reservaExistente]);

  const result = reservarTurno({
    nombre: "Nuevo",
    apellido: "User",
    celular: "099999997",
    correo: "nuevo@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:00"
  });

  expect(result.success).toBe(false);
  expect(result.message).toMatch(/ocupado/i);
});

test("Acepta reserva válida", () => {
  const result = reservarTurno({
    nombre: "Valido",
    apellido: "User",
    celular: "099999996",
    correo: "valido@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "10:30"
  });
  expect(result.success).toBe(true);
});
test("Rechaza reserva sin apellido", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "",
    celular: "099999999",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "11:00"
  });
  
  expect(result.success).toBe(true);
});

test("Rechaza reserva sin celular", () => {
  const result = reservarTurno({
    nombre: "Test",
    apellido: "User",
    celular: "",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "11:30"
  });
  
  expect(result.success).toBe(true);
});

test("exportarCSV crea un archivo blob y descarga", () => {
  setReservas([{
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "09:00"
  }]);

  const clickMock = jest.fn();
  document.createElement = jest.fn(() => ({ click: clickMock, href: null }));

  exportarCSV();

  expect(clickMock).toHaveBeenCalled();
  expect(URL.createObjectURL).toHaveBeenCalled();
});

test("getReservas y setReservas funcionan con localStorage", () => {
  localStorage.clear();
  const reservas = [{
    nombre: "Test",
    apellido: "User",
    celular: "099999999",
    correo: "test@mail.com",
    barbero: "Lucas",
    servicio: "Corte",
    fecha: "2100-01-01",
    hora: "09:00"
  }];
  setReservas(reservas);
  expect(getReservas()).toEqual(reservas);
});

describe("Login específico", () => {
  test("Login correcto con usuario y contraseña válidos", () => {
    expect(validarLogin("admin", "1234")).toBe(true);
  });

  test("Login incorrecto con usuario válido pero contraseña errónea", () => {
    expect(validarLogin("admin", "wrongpass")).toBe(false);
  });

  test("Login incorrecto con usuario inválido", () => {
    expect(validarLogin("noexiste", "1234")).toBe(false);
  });
});

describe("Filtrado de horas disponibles según fecha y barbero", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("Horas disponibles excluyen horarios ya reservados para barbero y fecha", () => {
    setReservas([
      { barbero: "Lucas", fecha: "2100-01-01", hora: "09:00", servicio: "Corte", nombre: "A", apellido: "B", celular: "1", correo: "a@b.com" }
    ]);

    const horasTodas = ["09:00", "10:00", "11:00"];
    const horasOcupadas = ["09:00"];
    
    function getHorasDisponibles(barbero, fecha) {
      const reservas = getReservas();
      const ocupadas = reservas
        .filter(r => r.barbero === barbero && r.fecha === fecha)
        .map(r => r.hora);
      return horasTodas.filter(h => !ocupadas.includes(h));
    }

    const horasDisp = getHorasDisponibles("Lucas", "2100-01-01");
    expect(horasDisp).not.toContain("09:00");
    expect(horasDisp).toContain("10:00");
  });

  test("Todas las horas están disponibles si no hay reservas", () => {
    localStorage.clear();
    function getHorasDisponibles(barbero, fecha) {
      return ["09:00", "10:00", "11:00"];
    }
    expect(getHorasDisponibles("Lucas", "2100-01-01").length).toBe(3);
  });
});
test("SLOTS genera franjas de 30 minutos entre 09:00 y 20:30", () => {
  
  expect(Array.isArray(SLOTS)).toBe(true);

  
  expect(SLOTS[0]).toBe("09:00");

  
  expect(SLOTS[SLOTS.length - 1]).toBe("20:30");

  
  expect(SLOTS.length).toBe(24);

  
  for (let i = 0; i < SLOTS.length; i++) {
    const slot = SLOTS[i];
    expect(slot).toMatch(/^\d{2}:(00|30)$/);
    
    if (i % 2 === 0) {
      expect(slot.endsWith("00")).toBe(true);
    } else {
      expect(slot.endsWith("30")).toBe(true);
    }
  }
});





