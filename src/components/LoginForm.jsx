import { useState } from "react";
import FormInput from "./FormInput";
import FormLabel from "./FormLabel";


export default function LoginForm() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");

    return (
        <div className="w-full h-full flex flex-col items-center justify-start gap-4">
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
                <button type="submit">Login</button>
            </div>
        </div>
    );
}
