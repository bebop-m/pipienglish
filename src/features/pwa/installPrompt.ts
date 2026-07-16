export interface InstallEnvironment {
  userAgent: string
  platform: string
  maxTouchPoints: number
  navigatorStandalone: boolean
  displayModeStandalone: boolean
}

const OTHER_IOS_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i

export function isIpadLike(environment: Pick<InstallEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>) {
  return /iPad/i.test(environment.userAgent)
    || (environment.platform === 'MacIntel' && environment.maxTouchPoints > 1)
}

export function isMobileSafari(environment: Pick<InstallEnvironment, 'userAgent'>) {
  return /Safari/i.test(environment.userAgent)
    && /Version\//i.test(environment.userAgent)
    && !OTHER_IOS_BROWSERS.test(environment.userAgent)
}

export function shouldShowInstallHint(environment: InstallEnvironment) {
  return isIpadLike(environment)
    && isMobileSafari(environment)
    && !environment.navigatorStandalone
    && !environment.displayModeStandalone
}
