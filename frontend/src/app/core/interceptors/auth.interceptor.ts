import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, filter, take, throwError, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth.model';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly tokenService = inject(TokenService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  private refreshing = false;
  private readonly refreshSubject = new Subject<string | null>();

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isAuthEndpoint(req.url)) {
      return next.handle(req);
    }

    const token = this.tokenService.getAccessToken();
    const authReq = token ? this.addToken(req, token) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthEndpoint(req.url)) {
          return this.handle401(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.refreshing) {
      return this.refreshSubject.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((token) => next.handle(this.addToken(req, token)))
      );
    }

    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      this.redirectToLogin();
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    this.refreshing = true;
    this.refreshSubject.next(null);

    const http = this.injector.get(HttpClient);

    return http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        switchMap((response) => {
          this.refreshing = false;
          this.refreshSubject.next(response.accessToken);
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
          this.persistUser(response.user);
          return next.handle(this.addToken(req, response.accessToken));
        }),
        catchError((error) => {
          this.refreshing = false;
          this.refreshSubject.next(null);
          this.tokenService.clear();
          this.redirectToLogin();
          return throwError(() => error);
        })
      );
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
  }

  private persistUser(user: unknown): void {
    localStorage.setItem('collab.user', JSON.stringify(user));
  }

  private redirectToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
