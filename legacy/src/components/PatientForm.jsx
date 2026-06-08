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
                <FormLabel name="phone-number" title="Phone Number" />
                <FormInput
                    type="tel"
                    name="phone-number"
                    title="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="date-of-birth" title="Date of Birth" />
                <FormInput
                    type="date"
                    name="date-of-birth"
                    title="Date of Birth"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="gender" title="Gender" />
                <FormInput
                    type="text"
                    name="gender"
                    title="Gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="address" title="Address" />
                <FormInput
                    type="text"
                    name="address"
                    title="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="occupation" title="Occupation" />
                <FormInput
                    type="text"
                    name="occupation"
                    title="Occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                />
            </div>
            <Heading title='Medical Information' />
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="emergency-contact-name" title="Emergency Contact Name" />
                <FormInput
                    type="text"
                    name="emergency-contact-name"
                    title="Emergency Contact Name"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="emergency-contact-number" title="Emergency Contact Number" />
                <FormInput
                    type="tel"
                    name="emergency-contact-number"
                    title="Emergency Contact Number"
                    value={emergencyContactNumber}
                    onChange={(e) => setEmergencyContactNumber(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name='primary-care-physician' title="Primary Care Physician" />
                <FormInput
                    type="text"
                    name="primary-care-physician"
                    title="Primary Care Physician"
                    value={primaryCarePhysician}
                    onChange={(e) => setPrimaryCarePhysician(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name="insurance-provider" title="Insurance Provider" />
                <FormInput
                    type="text"
                    name="insurance-provider"
                    title="Insurance Provider"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="insurance-policy-number" title="Insurance Policy Number" />
                <FormInput
                    type="text"
                    name="insurance-policy-number"
                    title="Insurance Policy Number"
                    value={insurancePolicyNumber}
                    onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="allergies" title="Allergies" />
                <FormInput
                    type="text"
                    name="allergies"
                    title="Allergies"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name='current-medication' title="Current Medication" />
                <FormInput
                    type="text"
                    name="current-medication"
                    title="Current Medication"
                    value={currentMedication}
                    onChange={(e) => setCurrentMedication(e.target.value)}
                />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="family-medical-history" title="Family Medical History" />
                <FormInput
                    type="text"
                    name="family-medical-history"
                    title="Family Medical History"
                    value={familyMedicalHistory}
                    onChange={(e) => setFamilyMedicalHistory(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name="past-medical-history" title="Past Medical History" />
                <FormInput
                    type="text"
                    name="past-medical-history"
                    title="Past Medical History"
                    value={pastMedicalHistory}
                    onChange={(e) => setPastMedicalHistory(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name="identification-type" title="Identification Type" />
                <FormInput
                    type="text"
                    name="identification-type"
                    title="Identification Type"
                    value={identificationType}
                    onChange={(e) => setIdentificationType(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name="identification-number" title="Identification Number" />
                <FormInput
                    type="text"
                    name="identification-number"
                    title="Identification Number"
                    value={identificationNumber}
                    onChange={(e) => setIdentificationNumber(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name='scanned-copy-document' title="Scanned Copy of Document" />
                <FormInput
                    type="file"
                    name="scanned-copy-document"
                    title="Scanned Copy of Document"
                    value={scannedCopyDocument}
                    onChange={(e) => setScannedCopyDocument(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name='consent-to-receive-treatments' title="Consent to Receive Treatments" />
                <FormInput
                    type="text"
                    name="consent-to-receive-treatments"
                    title="Consent to Receive Treatments"
                    value={consentToReceiveTreatments}
                    onChange={(e) => setConsentToReceiveTreatments(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name='consent-to-share-data' title="Consent to Share Data" />
                <FormInput
                    type="text"
                    name="consent-to-share-data"
                    title="Consent to Share Data"
                    value={consentToShareData}
                    onChange={(e) => setConsentToShareData(e.target.value)}
                />
            </div>
            <div className='w-full h-auto flex flex-col items-start justify-start gap-2'>
                <FormLabel name='consent-acknowledgement' title="Consent Acknowledgement" />
                <FormInput
                    type="text"
                    name="consent-acknowledgement"
                    title="Consent Acknowledgement"
                    value={consentAcknowledgement}
                    onChange={(e) => setConsentAcknowledgement(e.target.value)}
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
