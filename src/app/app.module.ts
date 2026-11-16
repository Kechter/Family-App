import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { HomepageComponent } from './homepage/homepage.component';
import { ProfileComponent } from './profile/profile.component';
import { WichtelnComponent } from './wichteln/wichteln.component';
import { WichtelRevealCardComponent } from './wichteln/wichtel-reveal-card/wichtel-reveal-card.component';
import { WichtelAdminPanelComponent } from './wichteln/wichtel-admin-panel/wichtel-admin-panel.component';
import { CalendarComponent } from './calendar/calendar.component';
import { CalendarMonthGridComponent } from './calendar/calendar-month-grid/calendar-month-grid.component';
import { CalendarEventFormComponent } from './calendar/calendar-event-form/calendar-event-form.component';
import { CalendarEventCardComponent } from './calendar/calendar-event-card/calendar-event-card.component';
import {
  UiAlertComponent,
  UiAvatarComponent,
  UiBadgeComponent,
  UiButtonComponent,
  UiCardComponent,
  UiConfirmModalComponent
} from './shared/ui';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomepageComponent,
    ProfileComponent,
    WichtelnComponent,
    WichtelRevealCardComponent,
    WichtelAdminPanelComponent,
    CalendarComponent,
    CalendarMonthGridComponent,
    CalendarEventFormComponent,
    CalendarEventCardComponent,
    UiAlertComponent,
    UiAvatarComponent,
    UiBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
    UiConfirmModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
