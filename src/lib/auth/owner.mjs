export function isPlatformOwner(userId, configuredId = process.env.DEFAULTSTACKR_OWNER_USER_ID) {
  return typeof userId === 'string' && userId.length > 0
    && typeof configuredId === 'string' && configuredId.length > 0 && userId === configuredId;
}
