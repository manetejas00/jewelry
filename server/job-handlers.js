import {createCatalogueDraft} from './ai-copy.js';

export const jobHandlers = {
  async 'copy.draft'(db, payload) {
    try {
      return await createCatalogueDraft(db, {
        sku: payload.sku,
        skill: payload.skill,
        tone: payload.tone,
        staffId: payload.staffId
      });
    } catch (error) {
      if (error && error.expose && error.status && error.status < 500) error.retryable = false;
      throw error;
    }
  }
};
