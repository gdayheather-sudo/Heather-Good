// @ts-check
/**
 * Binds htm (build-free JSX alternative) to React. Importing `html` here lets us
 * write components with tagged template literals and NO build step — the whole
 * app runs by opening index.html. React/htm load from a CDN via the importmap.
 */
import React from 'react';
import htm from 'htm';

export const html = htm.bind(React.createElement);
export const { useState, useEffect, useMemo, useCallback, useRef } = React;
export default React;
