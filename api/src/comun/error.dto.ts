import { ApiProperty } from '@nestjs/swagger';

/** Formato único de error de la API. Solo sirve para documentar en Swagger. */
export class ErrorDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'No encontrado' })
  error: string;

  @ApiProperty({ example: "No existe el indicador 'xyz'" })
  mensaje: string;
}
