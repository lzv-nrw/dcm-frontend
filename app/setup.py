from setuptools import setup


setup(
    name="dcm-frontend",
    description="frontend-application for the Digital Curation Manager",
    author="LZV.nrw",
    license="MIT",
    python_requires=">=3.10",
    install_requires=[
        "flask>=3,<4",
        "flask-login>=0.6.3,<1",
        "dcm-common[services]>=3.11.0,<4",
        "dcm-backend-sdk>=2.0.0,<3",
        "oai-pmh-extractor>=3.0.0,<4",
    ],
    extras_require={},
    packages=[
        "dcm_frontend",
        "dcm_frontend.views",
        "dcm_frontend.models",
    ],
    package_data={"dcm_frontend": ["client/**/*"]},
    setuptools_git_versioning={
        "enabled": True,
        "version_file": "../VERSION",
        "count_commits_from_version_file": True,
        "dev_template": "{tag}.dev{ccount}",
    },
)
