// Jonathan, Brett, Ayo
// All firebase user authentication functionality will go here 

export async function singUp(){
  console.log(`Attempting to sign up user: ${email}`);
  return {email};
}

export async function login(email, password) {
  console.log(`Attempting to log in user: ${email}`);
  // Placeholder for Firebase login logic.
  return { email }; // Modify this with Firebase user object.
}

export async function logout() {
  console.log("Logging out...");
  // Placeholder for Firebase logout logic.
  return true;
}
