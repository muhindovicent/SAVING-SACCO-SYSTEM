import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  path?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: 'Operation successful',
        timestamp: new Date().toISOString(),
        path,
      })),
      catchError((err) => {
        const status =
          err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = err instanceof HttpException ? err.message : 'Internal server error';
        return throwError(() => ({
          success: false,
          error: message,
          statusCode: status,
          timestamp: new Date().toISOString(),
          path,
        }));
      }),
    );
  }
}
