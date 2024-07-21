import { Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

export default function Login() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="w-1/2 h-full flex flex-col items-center justify-between p-20">
                <LoginForm />
                <p className='w-full text-left flex items-center justify-between text-white'>
                   <Link to="/register">Don&apos;t have an account? Sign Up Now</Link>
                   <Link className='text-primary' to="/admin/login">Admin</Link> 
                </p>
            </div>
            <div className="w-1/2 h-full flex flex-col items-center justify-center">
                <img
                    src="/assets/images/onboarding-img.png"
                    className="w-full h-full object-cover"
                    alt=""
                />
            </div>
        </div>
    );
}
