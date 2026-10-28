import { test, expect } from '@playwright/test';

test('mock signup retains all seven demo registration roles',async({page})=>{
 const requests=[];page.on('request',request=>{if(request.url().includes('/api/v1'))requests.push(request.url());});
 await page.goto('/signup');await expect(page.getByLabel('Requested role').locator('option')).toHaveCount(7);
 expect(await page.getByLabel('Requested role').locator('option').evaluateAll(options=>options.map(option=>option.value))).toEqual(['STUDENT','INSTRUCTOR','HOD','EXAM_STAFF','FINANCE_STAFF','IT_STAFF','ADMIN']);expect(requests).toEqual([]);
});
