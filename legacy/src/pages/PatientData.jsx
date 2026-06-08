import PatientForm from '../components/PatientForm';

export default function PatientData() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="w-1/2 h-full flex flex-col items-start justify-between p-20">
                <div className="w-full h-auto flex items-start justify-start gap-6">
                    <img src="/assets/icons/logo-full.svg" className='h-12' alt="" />
                </div>
                <PatientForm />
                <p></p>
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
