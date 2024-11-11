import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { fnPropsNotNullish } from '~/helpers';
import { IconJson } from '~/models/data/icon';
import { Theme } from '~/models/enum/theme';
import { getStoredValue } from '~/models/stored-signal';

import {
  initialPreferencesState,
  PreferencesService,
  PreferencesState,
} from '../store/preferences.service';
import { SettingsService } from '../store/settings.service';

const LAB_ICON_STYLE_ID = 'lab-icon-css';
const LAB_THEME_STYLE_ID = 'lab-theme-css';

export interface ThemeValues {
  textColor: string;
  successColor: string;
  successBackground: string;
  dangerColor: string;
  dangerBackground: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  document = inject(DOCUMENT);
  preferencesSvc = inject(PreferencesService);
  settingsSvc = inject(SettingsService);

  themeValues$ = new ReplaySubject<ThemeValues>(1);
  head = this.document.getElementsByTagName('head')[0];

  constructor() {
    effect(() => {
      const theme = this.preferencesSvc.theme();

      const themeLink = this.document.getElementById(
        LAB_THEME_STYLE_ID,
      ) as HTMLLinkElement | null;
      if (themeLink) {
        const href = this.themePath(theme);
        if (!themeLink.href.endsWith(href)) {
          // Need to switch theme, href has changed
          // Create a temporary link tag to load the new style sheet
          // Leave old href in place and wait for the new sheet to load
          const tempLink = this.document.createElement('link');
          tempLink.rel = 'stylesheet';
          tempLink.href = href;
          tempLink.onload = (): void => {
            // New style sheet has loaded, update the main themeLink and delete the temporary link
            themeLink.href = href;
            this.head.removeChild(tempLink);
            this.updateThemeValues();
          };
          this.head.appendChild(tempLink);
        } else this.updateThemeValues();
      }
      for (const t of [Theme.Light, Theme.Dark, Theme.Black]) {
        if (t === theme) this.document.body.classList.add(t);
        else this.document.body.classList.remove(t);
      }
    });

    effect(() => {
      const data = this.settingsSvc.dataset();

      // Generate .lab-icon::before css rules stylesheet
      const old = this.document.getElementById(LAB_ICON_STYLE_ID);
      if (old) this.head.removeChild(old);

      const style = this.document.createElement('style');
      style.id = LAB_ICON_STYLE_ID;
      let css = '';
      data.iconIds.forEach((i) => {
        const icon = data.iconEntities[i];
        const selector = this.escapeSelector(i);
        css += `.${selector}::before { background-image: url("${data.iconFile}"); background-position: ${icon.position}; } `;
        css += this.appendLightStyle(icon, selector, '');
      });
      data.itemIds
        .map((i) => data.itemEntities[i])
        .filter(fnPropsNotNullish('icon'))
        .filter((item) => !data.itemQIds.has(item.id))
        .forEach((item) => {
          const icon = data.iconEntities[item.icon];
          const selector = this.escapeSelector(item.id);
          css += `.${selector}.item::before { background-image: url("${data.iconFile}"); background-position: ${icon.position}; } `;
          css += this.appendLightStyle(icon, selector, '.item');
        });
      data.recipeIds
        .map((r) => data.recipeEntities[r])
        .filter(fnPropsNotNullish('icon'))
        .filter((recipe) => !data.recipeQIds.has(recipe.id))
        .forEach((recipe) => {
          const icon = data.iconEntities[recipe.icon];
          const selector = this.escapeSelector(recipe.id);
          css += `.${selector}.recipe::before { background-image: url("${data.iconFile}"); background-position: ${icon.position}; } `;
          css += this.appendLightStyle(icon, selector, '.recipe');
        });
      data.categoryIds
        .map((c) => data.categoryEntities[c])
        .filter(fnPropsNotNullish('icon'))
        .forEach((category) => {
          const icon = data.iconEntities[category.icon];
          const selector = this.escapeSelector(category.id);
          css += `.${selector}.category::before { background-image: url("${data.iconFile}"); background-position: ${icon.position}; } `;
          css += this.appendLightStyle(icon, selector, '.category');
        });
      data.locationIds
        .map((c) => data.locationEntities[c])
        .filter(fnPropsNotNullish('icon'))
        .forEach((location) => {
          const icon = data.iconEntities[location.icon];
          const selector = this.escapeSelector(location.id);
          css += `.${selector}.location::before { background-image: url("${data.iconFile}"); background-position: ${icon.position}; } `;
          css += this.appendLightStyle(icon, selector, '.location');
        });
      data.itemIds
        .map((i) => data.itemEntities[i])
        .filter(fnPropsNotNullish('iconText'))
        .filter((item) => !data.itemQIds.has(item.id))
        .forEach((item) => {
          const selector = this.escapeSelector(item.id);
          css += `.${selector}.item::before { content: "${item.iconText}"; } `;
        });
      data.recipeIds
        .map((i) => data.recipeEntities[i])
        .filter(fnPropsNotNullish('iconText'))
        .filter((recipe) => !data.recipeQIds.has(recipe.id))
        .forEach((recipe) => {
          const selector = this.escapeSelector(recipe.id);
          css += `.${selector}.recipe::before { content: "${recipe.iconText}"; } `;
        });
      data.categoryIds
        .map((i) => data.categoryEntities[i])
        .filter(fnPropsNotNullish('iconText'))
        .forEach((category) => {
          const selector = this.escapeSelector(category.id);
          css += `.${selector}.category::before { content: "${category.iconText}"; } `;
        });
      data.locationIds
        .map((i) => data.locationEntities[i])
        .filter(fnPropsNotNullish('iconText'))
        .forEach((location) => {
          const selector = this.escapeSelector(location.id);
          css += `.${selector}.location::before { content: "${location.iconText}"; } `;
        });
      style.innerText = css;
      this.head.appendChild(style);
    });
  }

  appendLightStyle(icon: IconJson, selector: string, type: string): string {
    if (!icon.invertLight) return '';
    let css = `body.light .${selector}${type}::before { filter: invert(1); } `;
    css += `.invert .${selector}::before { filter: invert(1); } `;
    return (css += `body.light .invert .${selector}::before { filter: none; } `);
  }

  updateThemeValues(): void {
    const style = getComputedStyle(this.document.body);
    const values: ThemeValues = {
      textColor: style.getPropertyValue('--text-color'),
      successColor: style.getPropertyValue('--success-color'),
      successBackground: style.getPropertyValue('--success-background'),
      dangerColor: style.getPropertyValue('--danger-color'),
      dangerBackground: style.getPropertyValue('--danger-background'),
    };
    this.themeValues$.next(values);
  }

  themePath(theme: Theme): string {
    switch (theme) {
      case Theme.Light:
        return 'theme-light.css';
      case Theme.Black:
        return 'theme-black.css';
      default:
        return 'theme-dark.css';
    }
  }

  private escapeSelector(className: string): string {
    return className.replace(/([^A-Za-z0-9_-])/g, '\\$1');
  }

  /**
   * Used to set up the initial theme without loading the full store.
   * Helps to prevent flashing that can occur if UI loads light theme and swaps to dark at runtime.
   * Unsafe to inject the full store in the app initializer because WASM may not be loaded yet.
   */
  static appInitTheme(): void {
    let theme = initialPreferencesState.theme;
    const stateStr = getStoredValue('preferences');
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr) as PreferencesState;
        theme = state.theme;
      } catch {
        // Ignore error
      }
    }

    if (theme === Theme.Light) {
      // Need to switch to light theme before app starts
      const themeLink = window.document.getElementById(
        LAB_THEME_STYLE_ID,
      ) as HTMLLinkElement | null;
      if (themeLink) themeLink.href = 'theme-light.css';
    }
  }
}
