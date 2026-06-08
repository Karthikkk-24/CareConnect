import { Link } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';

export default function Register() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="w-1/2 h-full flex flex-col items-start justify-between p-20">
                <div className="w-full h-auto flex items-start justify-start gap-6">
                    <img src="/assets/icons/logo-full.svg" className='h-12' alt="" />
                </div>
                <RegisterForm />
                <p className="w-full text-left flex items-center justify-between text-white">
                    <Link to="/login">
                        Already have an account? Login
                    </Link>
                    <Link className="text-primary" to="/admin/login">
                        Admin
                    </Link>
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
