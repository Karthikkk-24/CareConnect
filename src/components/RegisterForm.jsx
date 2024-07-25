import { useState } from "react";
import FormInput from "./FormInput";
import FormLabel from "./FormLabel";


export default function RegisterForm() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");

    return (
        <div className="w-1/2 h-auto flex flex-col items-start justify-start gap-6">
            <h1 className="text-3xl font-bold text-white">Hey there...</h1>
            <p className="text-white">Sign in to your account</p>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="email" title="Email" />
                <FormInput type="email" name="email" title="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="password" title="Password" />
                <FormInput type="password" name="password" title="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="phone" title="Phone Number" />
                <FormInput type="tel" name="phone" title="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <button type="submit" className="w-full h-10 px-4 py-2 uppercase  rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-primary text-white">Login</button>
            </div>
        </div>
    );
}
