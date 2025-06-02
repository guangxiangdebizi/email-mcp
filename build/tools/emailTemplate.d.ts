export namespace emailTemplate {
    let name: string;
    let description: string;
    namespace parameters {
        let type: string;
        namespace properties {
            namespace template_type {
                let type_1: string;
                export { type_1 as type };
                let description_1: string;
                export { description_1 as description };
                let _enum: string[];
                export { _enum as enum };
            }
            namespace title {
                let type_2: string;
                export { type_2 as type };
                let description_2: string;
                export { description_2 as description };
            }
            namespace recipient_name {
                let type_3: string;
                export { type_3 as type };
                let description_3: string;
                export { description_3 as description };
            }
            namespace content {
                let type_4: string;
                export { type_4 as type };
                let description_4: string;
                export { description_4 as description };
            }
            namespace sender_name {
                let type_5: string;
                export { type_5 as type };
                let description_5: string;
                export { description_5 as description };
            }
            namespace custom_fields {
                let type_6: string;
                export { type_6 as type };
                let description_6: string;
                export { description_6 as description };
            }
        }
        let required: string[];
    }
    function run(params: any): Promise<{
        success: boolean;
        data: {
            html: string;
            text: string;
            subject: any;
        };
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
        data?: undefined;
    }>;
}
