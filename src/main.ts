import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, Routes } from "@angular/router";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import { App } from "./app";
@Component({ standalone: true, template: "" })
class EmptyRoute {}
const routes: Routes = [{ path: "**", component: EmptyRoute }];
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection(), provideRouter(routes)],
}).catch(console.error);
