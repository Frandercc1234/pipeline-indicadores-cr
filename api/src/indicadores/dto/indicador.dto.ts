import { ApiProperty } from '@nestjs/swagger';

export class ObservacionDto {
  @ApiProperty({ example: '2026-11-16', description: 'Formato YYYY-MM-DD' })
  fecha: string;

  @ApiProperty({ example: 448.34 })
  valor: number;
}

export class IndicadorDto {
  @ApiProperty({ example: 'tc_venta' })
  slug: string;

  @ApiProperty({ example: 318, description: 'Código del indicador en el BCCR' })
  codigoBccr: number;

  @ApiProperty({ example: 'Tipo de cambio de referencia, venta' })
  nombre: string;

  @ApiProperty({ example: 'colones por dólar' })
  unidad: string;

  @ApiProperty({
    example: 'diaria',
    enum: ['diaria', 'semanal', 'mensual', 'irregular'],
  })
  periodicidad: string;

  @ApiProperty({
    type: ObservacionDto,
    nullable: true,
    description: 'Última observación publicada, o null si aún no hay datos',
  })
  ultimo: ObservacionDto | null;

  @ApiProperty({
    type: ObservacionDto,
    nullable: true,
    description: 'Observación inmediatamente anterior a la última',
  })
  anterior: ObservacionDto | null;
}

export class SerieDto {
  @ApiProperty({ example: 'tc_venta' })
  slug: string;

  @ApiProperty({ example: 'Tipo de cambio de referencia, venta' })
  nombre: string;

  @ApiProperty({ example: 'colones por dólar' })
  unidad: string;

  @ApiProperty({ example: '2024-01-01' })
  desde: string;

  @ApiProperty({ example: '2024-06-30' })
  hasta: string;

  @ApiProperty({
    type: [ObservacionDto],
    description: 'Ordenados por fecha ascendente. Puede venir vacío.',
  })
  datos: ObservacionDto[];
}
