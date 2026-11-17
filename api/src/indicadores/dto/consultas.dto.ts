import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export class SlugParamDto {
  @ApiProperty({
    example: 'tc_venta',
    description: 'Identificador del indicador: letras minúsculas y guion bajo',
  })
  @Matches(/^[a-z_]+$/, {
    message: 'slug inválido: use solo letras minúsculas y guion bajo',
  })
  slug: string;
}

export class SerieQueryDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Fecha inicial (YYYY-MM-DD). Por defecto 2015-01-01.',
  })
  @IsOptional()
  @Matches(SOLO_FECHA, { message: 'desde debe tener el formato YYYY-MM-DD' })
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'desde no es una fecha válida' },
  )
  desde?: string;

  @ApiPropertyOptional({
    example: '2024-06-30',
    description: 'Fecha final (YYYY-MM-DD). Por defecto, hoy.',
  })
  @IsOptional()
  @Matches(SOLO_FECHA, { message: 'hasta debe tener el formato YYYY-MM-DD' })
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'hasta no es una fecha válida' },
  )
  hasta?: string;
}
