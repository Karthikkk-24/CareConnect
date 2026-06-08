import PropTypes from 'prop-types';

export default function FormInput({ type, name, value, onChange }) {
    const inputStyles =
        'w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-800 text-white pl-10';

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
        <div className="w-full h-auto relative">
            <img src="/assets/icons/email.svg" className='absolute top-1/2 left-2 translate-y-[-50%]' alt="" />
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
