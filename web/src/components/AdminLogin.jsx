import React, { useState } from "react";
import "./AdminLogin.css";


function AdminLogin({ onLogin }) {


    const [username, setUsername] = useState("");

    const [password, setPassword] = useState("");




    function login(e){

        e.preventDefault();



        const user = username.trim();

        const pass = password.trim();



        if(
            user === "admin" &&
            pass === "admin123"
        ){


            localStorage.setItem(
                "admin",
                "true"
            );


            onLogin();


        }
        else{


            alert(
                "Invalid Credentials\nUse admin / admin123"
            );


        }


    }





    return (

        <div className="login-box">


            <h2>
                🔐 Admin Login
            </h2>



            <form onSubmit={login}>


                <input

                    type="text"

                    placeholder="Username"

                    value={username}

                    onChange={
                        e=>setUsername(
                            e.target.value
                        )
                    }

                />




                <input

                    type="password"

                    placeholder="Password"

                    value={password}

                    onChange={
                        e=>setPassword(
                            e.target.value
                        )
                    }

                />




                <button type="submit">

                    Login

                </button>



            </form>


        </div>

    );

}


export default AdminLogin;