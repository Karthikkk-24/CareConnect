export default function Login() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="w-1/2 h-full flex flex-col items-center justify-center p-8">
                <div className="w-full h-full flex flex-col items-center justify-start gap-4">
                    <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" required />
                    </div>
                    <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                        />
                    </div>
                    <div className="w-full h-auto flex flex-col items-start justify-start gap-2">
                        <button type="submit">Login</button>
                    </div>
                </div>
            </div>
            <div></div>
        </div>
    );
}
