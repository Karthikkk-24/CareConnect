import PropTypes from 'prop-types';
import PhoneInput from 'react-phone-number-input';

export default function FormInput({ type, name, value, onChange }) {
    const inputStyles =
        'w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-800 text-white';

    function produceInput(required, type, name) {
        switch (type) {
            case 'email':
                return (
                    <input
                        type="email"
                        id={name}
                        name={name}
                        value={value}
                        onChange={onChange}
                        {...required}
                        placeholder={`Enter your ${name}`}
                        className={inputStyles}
                    />
                );
            case 'password':
                return (
                    <input
                        type="password"
                        id={name}
                        name={name}
                        {...required}
                        value={value}
                        onChange={onChange}
                        placeholder={`Enter your ${name}`}
                        className={inputStyles}
                    />
                );
            case 'tel':
                return (
                    <input
                        type="tel"
                        id={name}
                        name={name}
                        {...required}
                        value={value}
                        onChange={onChange}
                        placeholder={`Enter your ${name}`}
                        className={inputStyles}
                    />
                );
            case 'select':
                return (
                    <select
                        id={name}
                        className={inputStyles}
                        name={name}
                        {...required}
                        onChange={onChange}
                        value={value}
                    >
                        <option value="select">Select ${name}</option>
                    </select>
                );
            default:
                return (
                    <input
                        type="text"
                        className={inputStyles}
                        id={name}
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={`Enter your ${name}`}
                        required
                    />
                );
        }
    }

    return (
        <div className="w-full h-auto">
            {produceInput(true, type, name, value, onChange)}
        </div>
    );
}

FormInput.propTypes = {
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
};