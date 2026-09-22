import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseFormat<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T> | T> {
    const request = context.switchToHttp().getRequest();

    // Skip transform for health check and swagger docs if needed
    if (request?.url?.includes('/health') || request?.url?.includes('/api/docs')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already in expected format { data, message }, return as is
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'message' in data
        ) {
          return data;
        }

        return {
          data: data ?? null,
          message: 'Success',
        };
      }),
    );
  }
}
