import PropTypes from 'prop-types';

export default function FormLabel({ name, title }) {
    return (
        <label htmlFor={name} className="text-white">
            {title}
        </label>
    );
}

FormLabel.propTypes = {
    name: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
};
