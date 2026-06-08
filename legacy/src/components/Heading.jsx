import PropTypes from 'prop-types';

export default function Heading({ title, customStyles = 'text-white' }) {
    return (
        <h2 className={`${customStyles} text-3xl font-semibold`}>{title}</h2>
    );
}

Heading.propTypes = {
    title: PropTypes.string.isRequired,
    customStyles: PropTypes.string,
};
