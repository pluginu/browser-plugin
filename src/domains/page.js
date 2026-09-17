import { setupDomainSkills } from './ui.js';
setupDomainSkills(document.querySelector('#skills-manager'), message => {
  const error = document.querySelector('#error'); error.textContent = message; error.hidden = !message;
});
