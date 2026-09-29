import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DomainErrorFilter } from './traceability/domain-error.filter';
import { TraceabilityController } from './traceability/traceability.controller';
import { TraceabilityService } from './traceability/traceability.service';
import { TraceabilityStore } from './traceability/traceability.store';

@Module({
  // Les classes qui déclarent des routes.
  controllers: [TraceabilityController],
  providers: [
    TraceabilityStore,
    TraceabilityService,
    // Le « middleware d'erreur » : une DomainError devient une réponse 400.
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
