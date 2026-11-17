import { hoyCostaRica } from './fechas';

describe('hoyCostaRica', () => {
  it('usa UTC-6: de madrugada en UTC todavía es el día anterior', () => {
    expect(hoyCostaRica(new Date('2026-11-17T03:00:00Z'))).toBe('2026-11-16');
  });

  it('pasado el mediodía UTC es el mismo día', () => {
    expect(hoyCostaRica(new Date('2026-11-16T18:00:00Z'))).toBe('2026-11-16');
  });

  it('a las 06:00 UTC ya empieza el día en Costa Rica', () => {
    expect(hoyCostaRica(new Date('2026-11-17T06:00:00Z'))).toBe('2026-11-17');
  });
});
