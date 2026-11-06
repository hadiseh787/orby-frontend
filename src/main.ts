import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Routes } from "@angular/router";
import { Component, ErrorHandler, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from "@angular/core";
import { OrbyErrorHandler } from './ui-errors';
import { App } from "./app";
@Component({ standalone: true, template: "" })
class EmptyRoute {}
const routes: Routes = [{ path: "**", component: EmptyRoute }];
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection(),provideBrowserGlobalErrorListeners(),{provide:ErrorHandler,useClass:OrbyErrorHandler}, provideRouter(routes)],
}).catch(error=>{console.error('Orby bootstrap failed',error);document.body.innerHTML='<main style="font:16px system-ui;padding:48px"><h1>Orby could not load</h1><p>Reload this page. Your pending transaction record has been preserved.</p><button onclick="location.reload()">Reload</button></main>';});
