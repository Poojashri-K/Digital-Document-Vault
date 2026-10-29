package com.vault.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI vaultOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Digital Document Vault API")
                        .description("RESTful API specification for Digital Document Vault: secure repository supporting upload, download, controlled sharing, versioning, metadata, and complete access auditing.")
                        .version("1.0.0")
                        .contact(new Contact().name("Vault Engineering Team").email("support@vault.local"))
                        .license(new License().name("Apache 2.0").url("https://www.apache.org/licenses/LICENSE-2.0")))
                .addSecurityItem(new SecurityRequirement().addList("cookieAuth"))
                .components(new Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .name("JSESSIONID")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .description("Standard HTTP session cookie established upon POST /api/auth/login")));
    }
}
