import { ErrorHandler, Injectable, inject, signal } from '@angular/core';
@Injectable({providedIn:'root'})
export class UiErrors { message=signal(''); }
@Injectable()
export class OrbyErrorHandler implements ErrorHandler {
  private state=inject(UiErrors);
  handleError(error:unknown){console.error('Orby unexpected interface error',error);this.state.message.set('This view could not finish loading. Reload the current view or return to the marketplace. Pending wallet transactions remain saved.');}
}
