export namespace getToken {
    let name: string;
    let description: string;
    namespace parameters {
        let type: string;
        namespace properties {
            namespace api_key {
                let type_1: string;
                export { type_1 as type };
                let description_1: string;
                export { description_1 as description };
            }
        }
        let required: string[];
    }
    function run(params: any): Promise<{
        success: boolean;
        data: {
            token: string;
            expiresIn: string;
        };
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
        data?: undefined;
    }>;
}
export namespace verifyToken {
    let name_1: string;
    export { name_1 as name };
    let description_2: string;
    export { description_2 as description };
    export namespace parameters_1 {
        let type_2: string;
        export { type_2 as type };
        export namespace properties_1 {
            namespace token {
                let type_3: string;
                export { type_3 as type };
                let description_3: string;
                export { description_3 as description };
            }
        }
        export { properties_1 as properties };
        let required_1: string[];
        export { required_1 as required };
    }
    export { parameters_1 as parameters };
    export function run_1(params: any): Promise<{
        error: string;
        success?: undefined;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            valid: boolean;
            details: string | jwt.JwtPayload;
            error?: undefined;
        };
        error?: undefined;
    } | {
        success: boolean;
        data: {
            valid: boolean;
            error: any;
            details?: undefined;
        };
        error?: undefined;
    }>;
    export { run_1 as run };
}
import jwt from 'jsonwebtoken';
