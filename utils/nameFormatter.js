
const extractNameFromEmail = (email) => {
    if (!email) return '';
    const namePart = email.split('@')[0];
    return namePart.split(/[\._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toUpperCase()).join(' ');
};

module.exports = { extractNameFromEmail };