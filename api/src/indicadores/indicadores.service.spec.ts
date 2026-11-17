import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  type FilaIndicador,
  IndicadoresRepository,
} from './indicadores.repository';
import { hoyCostaRica } from '../comun/fechas';
import { IndicadoresService } from './indicadores.service';

// Valores reales de tc_venta (BCCR, código 318), tal como los entrega pg: numeric como texto.
const FILA: FilaIndicador = {
  id: 2,
  slug: 'tc_venta',
  codigo_bccr: 318,
  nombre: 'Tipo de cambio de referencia, venta',
  unidad: 'colones por dólar',
  periodicidad: 'diaria',
  ultimo_fecha: '2026-11-16',
  ultimo_valor: '448.3400',
  anterior_fecha: '2026-11-15',
  anterior_valor: '448.3400',
};

describe('IndicadoresService', () => {
  const repositorio = {
    listar: jest.fn(),
    buscarPorSlug: jest.fn(),
    serie: jest.fn(),
  };
  let servicio: IndicadoresService;

  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new IndicadoresService(
      repositorio as unknown as IndicadoresRepository,
    );
  });

  describe('listar', () => {
    it('convierte el numeric de texto a número y arma ultimo y anterior', async () => {
      repositorio.listar.mockResolvedValue([FILA]);
      expect(await servicio.listar()).toEqual([
        {
          slug: 'tc_venta',
          codigoBccr: 318,
          nombre: 'Tipo de cambio de referencia, venta',
          unidad: 'colones por dólar',
          periodicidad: 'diaria',
          ultimo: { fecha: '2026-11-16', valor: 448.34 },
          anterior: { fecha: '2026-11-15', valor: 448.34 },
        },
      ]);
    });

    it('devuelve null en ultimo y anterior si no hay datos', async () => {
      repositorio.listar.mockResolvedValue([
        {
          ...FILA,
          ultimo_fecha: null,
          ultimo_valor: null,
          anterior_fecha: null,
          anterior_valor: null,
        },
      ]);
      const [indicador] = await servicio.listar();
      expect(indicador.ultimo).toBeNull();
      expect(indicador.anterior).toBeNull();
    });

    it('anterior es null si solo hay una observación', async () => {
      repositorio.listar.mockResolvedValue([
        { ...FILA, anterior_fecha: null, anterior_valor: null },
      ]);
      const [indicador] = await servicio.listar();
      expect(indicador.ultimo).toEqual({ fecha: '2026-11-16', valor: 448.34 });
      expect(indicador.anterior).toBeNull();
    });

    it('mantiene el orden que entrega el repositorio', async () => {
      repositorio.listar.mockResolvedValue([
        { ...FILA, slug: 'a' },
        { ...FILA, slug: 'b' },
      ]);
      const slugs = (await servicio.listar()).map((i) => i.slug);
      expect(slugs).toEqual(['a', 'b']);
    });
  });

  describe('obtener', () => {
    it('devuelve el indicador', async () => {
      repositorio.buscarPorSlug.mockResolvedValue(FILA);
      expect((await servicio.obtener('tc_venta')).codigoBccr).toBe(318);
    });

    it('lanza 404 si no existe', async () => {
      repositorio.buscarPorSlug.mockResolvedValue(undefined);
      await expect(servicio.obtener('no_existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('serie', () => {
    beforeEach(() => {
      repositorio.buscarPorSlug.mockResolvedValue(FILA);
    });

    it('convierte los valores y conserva el orden por fecha', async () => {
      repositorio.serie.mockResolvedValue([
        { fecha: '2026-11-14', valor: '448.3400' },
        { fecha: '2026-11-15', valor: '448.3400' },
      ]);
      const serie = await servicio.serie(
        'tc_venta',
        '2026-11-14',
        '2026-11-16',
      );
      expect(serie).toEqual({
        slug: 'tc_venta',
        nombre: 'Tipo de cambio de referencia, venta',
        unidad: 'colones por dólar',
        desde: '2026-11-14',
        hasta: '2026-11-16',
        datos: [
          { fecha: '2026-11-14', valor: 448.34 },
          { fecha: '2026-11-15', valor: 448.34 },
        ],
      });
      expect(repositorio.serie).toHaveBeenCalledWith(
        2,
        '2026-11-14',
        '2026-11-16',
      );
    });

    it('sin hasta llega hasta la última fecha disponible del indicador', async () => {
      repositorio.serie.mockResolvedValue([]);
      const serie = await servicio.serie('tc_venta');
      expect(serie.desde).toBe('2015-01-01');
      expect(serie.hasta).toBe(FILA.ultimo_fecha);
      expect(repositorio.serie).toHaveBeenCalledWith(
        2,
        '2015-01-01',
        FILA.ultimo_fecha,
      );
    });

    it('sin hasta no corta en hoy: una última fecha futura se incluye', async () => {
      repositorio.buscarPorSlug.mockResolvedValue({
        ...FILA,
        ultimo_fecha: '2999-01-02',
      });
      repositorio.serie.mockResolvedValue([]);
      expect((await servicio.serie('tc_venta')).hasta).toBe('2999-01-02');
    });

    it('sin hasta y sin datos usa la fecha de hoy', async () => {
      repositorio.buscarPorSlug.mockResolvedValue({
        ...FILA,
        ultimo_fecha: null,
        ultimo_valor: null,
      });
      repositorio.serie.mockResolvedValue([]);
      expect((await servicio.serie('tc_venta')).hasta).toBe(hoyCostaRica());
    });

    it('un desde posterior a la última fecha, sin hasta, devuelve la serie vacía (no es un 400)', async () => {
      repositorio.serie.mockResolvedValue([]);
      const serie = await servicio.serie('tc_venta', '2030-01-01');
      expect(serie.desde).toBe('2030-01-01');
      expect(serie.hasta).toBe('2030-01-01');
      expect(serie.datos).toEqual([]);
    });

    it('con hasta explícito lo respeta aunque haya datos posteriores', async () => {
      repositorio.serie.mockResolvedValue([]);
      const serie = await servicio.serie(
        'tc_venta',
        '2024-01-01',
        '2024-01-31',
      );
      expect(serie.hasta).toBe('2024-01-31');
      expect(repositorio.serie).toHaveBeenCalledWith(
        2,
        '2024-01-01',
        '2024-01-31',
      );
    });

    it('datos puede venir vacío', async () => {
      repositorio.serie.mockResolvedValue([]);
      expect(
        (await servicio.serie('tc_venta', '2015-01-01', '2015-01-02')).datos,
      ).toEqual([]);
    });

    it('lanza 400 si desde es posterior a hasta', async () => {
      await expect(
        servicio.serie('tc_venta', '2024-02-01', '2024-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza 400 si desde es anterior a 2015-01-01', async () => {
      await expect(
        servicio.serie('tc_venta', '2014-12-31', '2024-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza 404 si el indicador no existe', async () => {
      repositorio.buscarPorSlug.mockResolvedValue(undefined);
      await expect(
        servicio.serie('no_existe', '2024-01-01', '2024-01-31'),
      ).rejects.toThrow(NotFoundException);
      expect(repositorio.serie).not.toHaveBeenCalled();
    });
  });
});
