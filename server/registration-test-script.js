const axios = require("axios");

// Function to test user registration
const testUserRegistration = async () => {
  try {
    const response = await axios.post(
      "http://localhost:4501/api/users/register",
      {
        username: "testuser",
        password: "test123",
      }
    );
    console.log("Registration successful:", response.data);
  } catch (error) {
    console.error(
      "Registration failed:",
      error.response ? error.response.data : error.message
    );
  }
};

// Run the test
testUserRegistration();
