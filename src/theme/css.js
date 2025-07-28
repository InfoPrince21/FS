import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

/**
 * Creates a CSS background gradient.
 * @param {object} props - The properties for the gradient.
 * @param {'to top' | 'to bottom' | 'to left' | 'to right' | string} [props.direction='to bottom'] - The direction of the gradient.
 * @param {string} [props.startColor] - The starting color of the gradient.
 * @param {string} [props.endColor] - The ending color of the gradient.
 * @param {string} [props.imgUrl] - The URL of an image to use with the gradient overlay.
 * @param {string} [props.color=alpha('#000000', 0.0)] - The base color for the gradient overlay when imgUrl is provided.
 * @returns {object} - CSS properties for background.
 */
export function bgGradient(props) {
  const {
    direction = 'to bottom',
    startColor,
    endColor,
    imgUrl,
    color = alpha('#000000', 0.0),
  } = props;

  if (imgUrl) {
    return {
      background: `linear-gradient(${direction}, ${startColor || color}, ${endColor || color}), url(${imgUrl})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
    };
  }

  return {
    background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
  };
}
