import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


export default function Main() {

    const navigate = useNavigate()

    const checkLoggedIn = () => {
        if (localStorage.getItem('token')) {
            navigate('/dashboard');
        } else {
            navigate('/dashboard');
            // navigate('/login');
        }
    }

    useEffect(() => {
        checkLoggedIn();
    }, []);
}
