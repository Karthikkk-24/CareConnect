import FormLabel from "./FormLabel";


export default function LoginForm() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-start gap-4">
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="email" title="Email" />
                <input type="email" id="email" name="email" required />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <FormLabel name="password" title="Password" />
                <input type="password" id="password" name="password" required />
            </div>
            <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                <button type="submit">Login</button>
            </div>
        </div>
    );
}
