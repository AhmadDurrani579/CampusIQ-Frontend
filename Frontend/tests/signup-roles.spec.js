import { test, expect } from '@playwright/test';
const roles=['STUDENT','INSTRUCTOR','HOD','EXAM_STAFF','FINANCE_STAFF','IT_STAFF'];
const person={full_name:'Signup Role Test',email:'signup-role@example.edu',password:'FixturePass123!'};
async function fill(page, role){
 await page.getByLabel('Full name',{exact:true}).fill(person.full_name);
 await page.getByLabel('Email address',{exact:true}).fill(person.email);
 await page.getByLabel('Requested role').selectOption(role);
 await page.getByLabel('Password',{exact:true}).fill(person.password);
 await page.getByLabel('Confirm password',{exact:true}).fill(person.password);
 await page.getByLabel(/I agree/).check();
}
for(const role of roles)test(`API signup accepts and submits ${role} as a pending request`,async({page})=>{
 let payload;let authorization;let count=0;
 await page.route('**/api/v1/auth/signup',route=>{count++;payload=route.request().postDataJSON();authorization=route.request().headers().authorization;return route.fulfill({status:201,json:{message:'Pending administrator approval'}});});
 await page.goto('/signup');
 await expect(page.getByLabel('Requested role').locator('option')).toHaveCount(6);
 expect(await page.getByLabel('Requested role').locator('option').evaluateAll(options=>options.map(option=>option.value))).toEqual(roles);
 await fill(page,role);await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page).toHaveURL(/pending-approval/);expect(payload).toEqual({...person,requested_role:role});expect(count).toBe(1);expect(authorization).toBeUndefined();
 await page.goto('/profile');await expect(page).toHaveURL(/login/);
});

test('public API signup rejects Admin and unknown roles before sending a request',async({page})=>{
 let count=0;await page.route('**/api/v1/auth/signup',route=>{count++;return route.fulfill({status:201,json:{}});});await page.goto('/signup');
 for(const requested_role of ['ADMIN','SUPER_ADMIN']){
  const message=await page.evaluate(async body=>{try{const{signup}=await import('/src/api/authApi.js');await signup(body);return 'unexpected acceptance';}catch(error){return error.message;}},{...person,requested_role});
  expect(message).toMatch(/supported registration role/i);
 }expect(count).toBe(0);
});

test('backend rejection of a new signup role is shown without claiming success',async({page})=>{
 await page.route('**/api/v1/auth/signup',route=>route.fulfill({status:422,json:{detail:[{loc:['body','requested_role'],msg:'This department role is not supported by the backend yet',type:'enum'}]}}));
 await page.goto('/signup');await fill(page,'EXAM_STAFF');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('alert')).toContainText('This department role is not supported by the backend yet');await expect(page).toHaveURL(/signup$/);
});
