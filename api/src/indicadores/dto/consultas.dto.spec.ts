import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SerieQueryDto, SlugParamDto } from './consultas.dto';

async function errores<T extends object>(
  clase: new () => T,
  datos: object,
): Promise<string[]> {
  const resultado = await validate(plainToInstance(clase, datos));
  return resultado.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('SlugParamDto', () => {
  it.each(['tc_venta', 'ipc_indice', 'tbp'])('acepta %s', async (slug) => {
    expect(await errores(SlugParamDto, { slug })).toEqual([]);
  });

  it.each(['TC_VENTA', 'tc-venta', 'tc venta', 'tc1', '../etc', "a'; drop"])(
    'rechaza %s',
    async (slug) => {
      expect(await errores(SlugParamDto, { slug })).not.toEqual([]);
    },
  );
});

describe('SerieQueryDto', () => {
  it('acepta que no vengan fechas', async () => {
    expect(await errores(SerieQueryDto, {})).toEqual([]);
  });

  it('acepta fechas válidas', async () => {
    expect(
      await errores(SerieQueryDto, {
        desde: '2024-01-01',
        hasta: '2024-06-30',
      }),
    ).toEqual([]);
  });

  it('acepta el 29 de febrero de un año bisiesto', async () => {
    expect(await errores(SerieQueryDto, { desde: '2024-02-29' })).toEqual([]);
  });

  it.each([
    '2024/01/01',
    '01-01-2024',
    '2024-1-1',
    '2024-01-01T00:00:00Z',
    '2023-02-29',
    '2024-13-01',
    '2024-02-30',
    'ayer',
  ])('rechaza la fecha %s', async (desde) => {
    expect(await errores(SerieQueryDto, { desde })).not.toEqual([]);
    expect(await errores(SerieQueryDto, { hasta: desde })).not.toEqual([]);
  });
});
