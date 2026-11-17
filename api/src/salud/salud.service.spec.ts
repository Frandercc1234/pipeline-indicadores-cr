import { SaludRepository } from './salud.repository';
import { SaludService } from './salud.service';

const AHORA = new Date('2026-11-16T18:00:00Z');
const horasAntes = (horas: number) =>
  new Date(AHORA.getTime() - horas * 3_600_000);

describe('SaludService', () => {
  const repositorio = { ultimaCargaDiariaOk: jest.fn() };
  let servicio: SaludService;

  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new SaludService(repositorio as unknown as SaludRepository);
  });

  it('está ok si la última carga diaria es reciente', async () => {
    repositorio.ultimaCargaDiariaOk.mockResolvedValue({
      tipo: 'diaria',
      fin: horasAntes(5.25),
      estado: 'ok',
    });
    expect(await servicio.comprobar(AHORA)).toEqual({
      estado: 'ok',
      base: 'ok',
      ultimaCarga: {
        tipo: 'diaria',
        fin: horasAntes(5.25).toISOString(),
        estado: 'ok',
      },
      horasDesdeUltimaCarga: 5.3,
    });
  });

  it('está ok justo a las 36 horas', async () => {
    repositorio.ultimaCargaDiariaOk.mockResolvedValue({
      tipo: 'diaria',
      fin: horasAntes(36),
      estado: 'ok',
    });
    expect((await servicio.comprobar(AHORA)).estado).toBe('ok');
  });

  it('está degradado si pasaron más de 36 horas', async () => {
    repositorio.ultimaCargaDiariaOk.mockResolvedValue({
      tipo: 'diaria',
      fin: horasAntes(36.5),
      estado: 'ok',
    });
    const salud = await servicio.comprobar(AHORA);
    expect(salud.estado).toBe('degradado');
    expect(salud.base).toBe('ok');
    expect(salud.horasDesdeUltimaCarga).toBe(36.5);
  });

  it('está degradado si nunca hubo una carga diaria exitosa', async () => {
    repositorio.ultimaCargaDiariaOk.mockResolvedValue(undefined);
    expect(await servicio.comprobar(AHORA)).toEqual({
      estado: 'degradado',
      base: 'ok',
      ultimaCarga: null,
      horasDesdeUltimaCarga: null,
    });
  });

  it('está degradado con base en error si la consulta falla', async () => {
    repositorio.ultimaCargaDiariaOk.mockRejectedValue(
      new Error('sin conexión'),
    );
    expect(await servicio.comprobar(AHORA)).toEqual({
      estado: 'degradado',
      base: 'error',
      ultimaCarga: null,
      horasDesdeUltimaCarga: null,
    });
  });
});
