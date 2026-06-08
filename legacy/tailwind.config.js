/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'primary': '#24AE7C',
                'background': '#131619',
            }
        },
    },
    plugins: [],
};
