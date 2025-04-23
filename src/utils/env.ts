import 'dotenv/config';

export class EnvVariableError extends Error {

}

export function getEnvValueOrThrow(envVariableName: string, additionalErrorMessage?: string) {
    const value = process.env[envVariableName];

    if(!value) {
        let errorMessage = `Environment variable ${envVariableName} is not defined`;

        if(additionalErrorMessage) {
            errorMessage += `, ${additionalErrorMessage}`;
        }

        throw new EnvVariableError(errorMessage);
    }

    return value;
}

export function getIntegerEnvValueOrThrow(envVariableName: string, minValue?: number, maxValue?: number, additionalErrorMessage?: string) {
    const value = getEnvValueOrThrow(envVariableName, additionalErrorMessage);
    const numValue = parseInt(value);

    if(!isFinite(numValue)) {
        throw new EnvVariableError(`Environment variable ${envVariableName} must be a finite integer`);
    }

    else if(minValue !== undefined && numValue < minValue) {
        throw new EnvVariableError(`Environment variable ${envVariableName} cannot be less than ${minValue}, is currently ${numValue}`);
    }

    else if(maxValue !== undefined && numValue > maxValue) {
        throw new EnvVariableError(`Environment variable ${envVariableName} cannot be greater than ${maxValue}, is currently ${numValue}`);
    }

    return numValue;
}