import {test,expect} from '@playwright/test';
test('header icon switches and persists all three themes with keyboard and mobile support',async({page})=>{
 await page.goto('/');const toggle=page.getByRole('button',{name:'Change color theme'});await expect(toggle).toBeVisible();
 await toggle.click();await expect(page.getByRole('menu',{name:'Appearance'})).toBeVisible();await page.getByRole('menuitemradio',{name:'Dark',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(toggle).toBeFocused();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await toggle.click();await page.getByRole('menuitemradio',{name:'Light',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await toggle.click();await page.keyboard.press('End');await expect(page.getByRole('menuitemradio',{name:'System',exact:true})).toBeFocused();await page.keyboard.press('Enter');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await toggle.click();await page.keyboard.press('Escape');await expect(page.getByRole('menu')).not.toBeVisible();await expect(toggle).toBeFocused();
 await page.screenshot({path:'test-results/updated-dark-desktop.png',fullPage:true});await page.setViewportSize({width:375,height:812});await expect(toggle).toBeVisible();await toggle.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/updated-dark-mobile.png',fullPage:true});await page.getByRole('menuitemradio',{name:'Light',exact:true}).click();await page.screenshot({path:'test-results/updated-light-mobile.png',fullPage:true});
});
