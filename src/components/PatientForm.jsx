import { useState } from 'react';
import FormInput from './FormInput';
import FormLabel from './FormLabel';
import Heading from './Heading';

export default function PatientForm() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [occupation, setOccupation] = useState('');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
    const [primaryCarePhysician, setPrimaryCarePhysician] = useState('');
    const [insuranceProvider, setInsuranceProvider] = useState('');
    const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
    const [allergies, setAllergies] = useState('');
    const [currentMedication, setCurrentMedication] = useState('');
    const [familyMedicalHistory, setFamilyMedicalHistory] = useState('');
    const [pastMedicalHistory, setPastMedicalHistory] = useState('');
    const [identificationType, setIdentificationType] = useState('');
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [scannedCopyDocument, setScannedCopyDocument] = useState(null);
    const [consentToReceiveTreatments, setConsentToReceiveTreatments] = useState(null);
    const [consentToShareData, setConsentToShareData] = useState(null);
    const [consentAcknowledgement, setConsentAcknowledgement] = useState(null);

    return (
        <div className="w-1/2 h-auto flex flex-col items-start justify-start gap-6">
            <h1 className="text-3xl font-bold text-white">Welcome 👋🏻</h1>
            <p className="text-white">Let us know more about you</p>
            <Heading title='Personal Information' />
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="full-name" title="Full Name" />
                <FormInput
                    type="text"
                    name="full-name"
                    title="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="email" title="Email" />
                <FormInput
                    type="email"
                    name="email"
                    title="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="password" title="Password" />
                <FormInput
                    type="password"
                    name="password"
                    title="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <button
                    type="submit"
                    className="w-full h-10 px-4 py-2 uppercase  rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-primary text-white"
                >
                    Login
                </button>
            </div>
        </div>
    );
}
