import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../domain/domain-error';

// Nest appelle ce filtre dès qu'une DomainError est levée dans une route :
// une règle métier a refusé, donc on répond 400 avec le message de la règle.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(400).json({ statusCode: 400, message: error.message });
  }
}
