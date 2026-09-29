package com.universe;

import com.universe.global.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class UniverseApplication {

	public static void main(String[] args) {
		DotenvLoader.load();
		SpringApplication.run(UniverseApplication.class, args);
	}

}
